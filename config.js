window.oidcConfig = {
    authority: "https://keycloak.example.com/realms/myrealm",
    client_id: "oidc-demo",

    redirect_uri: "https://demo.example.com/",
    post_logout_redirect_uri: "https://demo.example.com/",

    response_type: "code",
    scope: "openid profile email offline_access",

    automaticSilentRenew: false
};