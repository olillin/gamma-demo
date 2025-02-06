import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'

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

function getToken(code: string) {
    return new Promise((resolve, reject) => {
        const url =
            `https://auth.chalmers.it/oauth2/token` + //
            `?code=${code}` +
            // `&scope=openid profile` +
            `&grant_type=authorization_code` +
            `&client_id=${ENVIRONMENT.CLIENT_ID}` +
            `&client_secret=${ENVIRONMENT.CLIENT_SECRET}` +
            `&redirect_uri=${ENVIRONMENT.REDIRECT_URI}`

        fetch(url, {
            method: 'POST',
        })
            .then(res => res.text())
            .then(resolve)
    })
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

    const token = await getToken(code.toString())
    console.log(`Token: ${token}`)

    fetch('https://auth.chalmers.it/oauth2/userinfo', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then(res => res.json())
        .then(res.json)
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
