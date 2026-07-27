import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

// The root navigator's guard (app/_layout.tsx) redirects away from here based
// on auth + role state. This is just what shows during that brief moment.
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
