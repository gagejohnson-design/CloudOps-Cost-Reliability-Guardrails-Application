// frontend/config.js
window.CLOUDOPS_CONFIG = {
  // From stack Outputs:
  // - CognitoHostedUiLoginUrl (or parse domain/client from it)
  // - CognitoUserPoolClientId
  // - AppUrl (CloudFront URL)

  // Example: https://cloudops-123456789012-us-east-2.auth.us-east-2.amazoncognito.com
  cognitoDomain: "PASTE_COGNITO_DOMAIN_BASE_URL_HERE",

  // Example: "abc123clientid"
  clientId: "PASTE_COGNITO_CLIENT_ID_HERE",

  // Must match your template callback: https://<cloudfront-domain>/callback
  redirectUri: "PASTE_APP_URL_HERE/callback",

  // Your API base (Phase 2). For Phase 1 we keep fake data.
  apiBaseUrl: "PASTE_API_BASE_URL_HERE",
};
