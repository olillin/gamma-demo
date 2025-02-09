const login = document.getElementById('login') as HTMLAnchorElement
const profile = document.getElementById('profile') as HTMLDivElement
const profileRaw = document.getElementById('profileRaw') as HTMLPreElement
const profilePicture = document.getElementById('profilePicture') as HTMLImageElement
const profileName = document.getElementById('profileName') as HTMLHeadingElement
const groupsList = document.getElementById('groups') as HTMLUListElement

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
    profile.style.display = 'block'
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
        profileName.innerText = profileData.profile.name
        profilePicture.src = profileData.profile.picture
        profileRaw.innerHTML = JSON.stringify(profileData, null, '  ')

        // Groups
        const groups: any[] = profileData.groups
        groups.forEach(group => {
            const item = document.createElement('li')
            item.innerText = `${group.prettyName} : ${group.superGroup.prettyName}`
            groupsList.appendChild(item)
        })
    })
}

const search = new URLSearchParams(window.location.search)
if (search.has('code')) {
    showProfile(search.get('code')!)
    removeLogin()
} else {
    showLogin()
}
