import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToChildren, listenToFamily } from '@/services/families';
import { signOutUser } from '@/services/auth';
import { Family, UserProfile } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function FamilyScreen() {
  const { profile } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile?.familyId) return;
    const u1 = listenToFamily(profile.familyId, setFamily);
    const u2 = listenToChildren(profile.familyId, setChildren);
    return () => {
      u1();
      u2();
    };
  }, [profile?.familyId]);

  async function shareCode() {
    if (!family) return;
    await Share.share({
      message: `Join our family on Teen Chore Monitor! Download the app, sign up as a Teen, and enter invite code: ${family.inviteCode}`,
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      <Card>
        <Text style={styles.familyName}>{family?.name ?? '…'}</Text>
        <Text style={styles.label}>Invite code</Text>
        <Pressable onPress={shareCode} style={styles.codeBox}>
          <Text style={styles.code}>{family?.inviteCode ?? '······'}</Text>
        </Pressable>
        <Text style={styles.hint}>Tap the code to share it. Kids enter it when they sign up.</Text>
        <Button title="Share invite code" variant="secondary" onPress={shareCode} />
      </Card>

      <Text style={styles.sectionTitle}>Kids ({children.length})</Text>
      {children.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No kids yet. Share the invite code above.</Text>
        </Card>
      ) : (
        children.map((c) => (
          <Card key={c.uid}>
            <View style={styles.memberRow}>
              <Text style={styles.memberName}>{c.displayName}</Text>
              <Text style={styles.memberPoints}>⭐ {c.points ?? 0}</Text>
            </View>
            <Text style={styles.muted}>{c.email}</Text>
          </Card>
        ))
      )}

      <View style={{ height: spacing.xl }} />
      <Button title="Sign out" variant="danger" onPress={() => signOutUser()} />
      <Text style={styles.signedInAs}>Signed in as {profile?.email}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  familyName: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  codeBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  code: { fontSize: 36, fontWeight: '900', letterSpacing: 8, color: colors.primaryDark },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  muted: { color: colors.textMuted },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '700', color: colors.text },
  memberPoints: { fontSize: 15, fontWeight: '800', color: colors.points },
  signedInAs: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.md, fontSize: 12 },
});
