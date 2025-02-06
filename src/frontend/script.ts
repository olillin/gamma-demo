const login = document.getElementById('login') as HTMLAnchorElement
const profile = document.getElementById('profile') as HTMLDivElement

function showLogin() {
    fetch('/env')
        .then(res => res.text())
        .then(text => {
            const [CLIENT_ID, REDIRECT_URI] = text.split('\n')
            login.href = `https://auth.chalmers.it/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20profile`
        })
}

function removeLogin() {
    login.remove()
}

function showProfile(code: string) {
    profile.style.display = 'auto'
    fetch(`/profile?code=${code}`).then(async res => {
        if (!res.ok) {
            try {
                const { error } = await res.json()
                profile.innerHTML = `Could not load profile: ${error}`
            } catch (error) {
                profile.innerHTML = 'Could not load profile'
            }
            return
        }

        const profileData = await res.json()
        profile.innerHTML = JSON.stringify(profileData)
    })
}

const search = new URLSearchParams(window.location.search)
if (search.has('code')) {
    showProfile(search.get('code')!)
    removeLogin()
} else {
    showLogin()
}
