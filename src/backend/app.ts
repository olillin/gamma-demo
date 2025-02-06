import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { AuthorizationCode } from 'simple-oauth2'

// Environment variables
interface EnvironmentVariables {
    PORT?: Number
    CLIENT_ID: string
    CLIENT_SECRET: string
    REDIRECT_URI: string
}

// Remove 'optional' attributes from a type's properties
type Concrete<Type> = {
    [Property in keyof Type]-?: Type[Property]
}

const DEFAULT_ENVIRONMENT: Partial<Concrete<EnvironmentVariables>> = {
    PORT: 8080,
}

const requiredEnvironment: (keyof EnvironmentVariables)[] = ['CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI']
requiredEnvironment.forEach(required => {
    if (!(required in process.env)) {
        console.error(`Missing required environment variable: ${required}`)
        process.exit()
    }
})
const ENVIRONMENT: Concrete<EnvironmentVariables> = Object.assign(Object.assign({}, DEFAULT_ENVIRONMENT), process.env as unknown as EnvironmentVariables) as Concrete<EnvironmentVariables>
const { PORT } = ENVIRONMENT

// Paths
const PUBLIC_DIRECTORY = 'public'

// Setup express app
const app = express()

if (fs.existsSync(PUBLIC_DIRECTORY)) {
    app.use('/', express.static(PUBLIC_DIRECTORY))
} else {
    console.warn('WARNING: No public directory')
}

async function getToken(code: string) {
    const client = new AuthorizationCode({
        client: {
            id: ENVIRONMENT.CLIENT_ID,
            secret: ENVIRONMENT.CLIENT_SECRET,
        },
        auth: {
            tokenHost: 'https://auth.chalmers.it',
            tokenPath: '/oauth2/token',
        },
    })

    const tokenParams = {
        code: code,
        redirect_uri: ENVIRONMENT.REDIRECT_URI,
        scope: ['openid', 'profile'],
        grant_type: 'authorization_code',
    }

    return client.getToken(tokenParams)
}

app.get('/env', (req, res) => {
    res.end(ENVIRONMENT.CLIENT_ID + '\n' + ENVIRONMENT.REDIRECT_URI)
})

app.get('/profile', async (req, res) => {
    const code = req.query.code
    if (!code) {
        res.status(401).json({ error: 'Missing authentication code' })
        return
    }

    var accessToken: string
    try {
        const token = await getToken(code.toString())
        console.log(`Token: ${JSON.stringify(token)}`)
        accessToken = token.token.access_token as string
    } catch (error) {
        console.error(`Failed to get access token ${error}`)
        res.status(500).json({ error: 'Failed to get access token' })
        return
    }

    fetch('https://auth.chalmers.it/oauth2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then(response => response.json())
        .then(json => res.json(json))
})

// Start server
var server
var useHttps = fs.existsSync('./key.pem') && fs.existsSync('./cert.pem')
if (useHttps) {
    server = https.createServer(
        {
            key: fs.readFileSync('./key.pem'),
            cert: fs.readFileSync('./cert.pem'),
        },
        app
    )
} else {
    server = http.createServer({}, app)
}

server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})
