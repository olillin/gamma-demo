import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { AuthorizationCode, ClientApi } from 'gammait'

// Environment variables
interface EnvironmentVariables {
    PORT?: Number
    CLIENT_ID: string
    CLIENT_SECRET: string
    REDIRECT_URI: string
    API_KEY?: string
    PRE_SHARED_AUTH: string
}

// Remove 'optional' attributes from a type's properties
type Concrete<Type> = {
    [Property in keyof Type]-?: Type[Property]
}

const DEFAULT_ENVIRONMENT: Partial<Concrete<EnvironmentVariables>> = {
    PORT: 8080,
}

const requiredEnvironment: (keyof EnvironmentVariables)[] = ['CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI', 'PRE_SHARED_AUTH']
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

const authorizedClient = new AuthorizationCode({
    clientId: ENVIRONMENT.CLIENT_ID,
    clientSecret: ENVIRONMENT.CLIENT_SECRET,
    redirectUri: ENVIRONMENT.REDIRECT_URI,
    scope: ['openid', 'profile'],
})

const clientApi = new ClientApi({
    authorization: ENVIRONMENT.PRE_SHARED_AUTH,
})

app.get('/authorize', (req, res) => {
    const url = authorizedClient.authorizeUrl()
    res.redirect(url)
})

app.get('/profile', async (req, res) => {
    const code = req.query.code
    if (!code) {
        res.status(401).json({ error: 'Missing authentication code' })
        return
    }

    try {
        await authorizedClient.generateToken(code.toString())

        const profile = await authorizedClient.userInfo()
        const groups = await clientApi.getGroupsFor(profile.sub)

        res.json({
            profile: profile,
            groups: groups,
        })
    } catch (error) {
        console.error(`Failed to get access token ${error}`)
        res.status(500).json({ error: 'Failed to get access token' })
        return
    }
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
