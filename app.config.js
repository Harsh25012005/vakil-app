// Extends app.json. The Google Sign-In config plugin is only needed for iOS (it registers the
// reversed iOS client ID as a URL scheme) and refuses to run without one, so it is added only
// when EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set. Android needs no plugin options.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    const id = iosClientId.replace('.apps.googleusercontent.com', '');
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: `com.googleusercontent.apps.${id}` }]);
  }
  return { ...config, plugins };
};
