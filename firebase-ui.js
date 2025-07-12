
// firebase-ui.js
import { auth } from './firebase-init.js';
import { EmailAuthProvider, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// FirebaseUI config.
const uiConfig = {
  signInSuccessUrl: '<url-to-redirect-to-on-success>',
  signInOptions: [
    // Leave the lines as is for the providers you want to offer your users.
    GoogleAuthProvider.PROVIDER_ID,
    EmailAuthProvider.PROVIDER_ID
  ],
  // tosUrl and privacyPolicyUrl accept either url string or a callback
  // function.
  // Terms of service url/callback.
  tosUrl: '<your-tos-url>',
  // Privacy policy url/callback.
  privacyPolicyUrl: function() {
    window.location.assign('<your-privacy-policy-url>');
  }
};

// Initialize the FirebaseUI Widget using Firebase.
const ui = new firebaseui.auth.AuthUI(auth);
// The start method will wait until the DOM is loaded.
ui.start('#firebaseui-auth-container', uiConfig);
