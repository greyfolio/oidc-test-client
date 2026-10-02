window.userManager = new oidc.UserManager({
    ...window.oidcConfig,

    userStore: new oidc.WebStorageStateStore({
        store: window.sessionStorage
    })
});

window.auth = {
    login: () => userManager.signinRedirect(),

    logout: () => userManager.signoutRedirect(),

    getUser: () => userManager.getUser(),

    handleCallback: () =>
        userManager.signinRedirectCallback(),

    async renewToken() {
        const user = await userManager.getUser();

        if (!user?.refresh_token) {
            throw new Error("No refresh token available");
        }

        const renewed = await userManager.signinSilent();

        if (!renewed) {
            throw new Error("Token renewal failed");
        }

        return renewed;
    }
};