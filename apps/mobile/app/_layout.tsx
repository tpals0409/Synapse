import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  useFonts as useSourceSerif4,
} from '@expo-google-fonts/source-serif-4';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { fonts } from '@synapse/design-system';

SplashScreen.preventAutoHideAsync().catch(() => {
  // splash 가 이미 숨겨졌거나 web 에서 미지원이면 무시.
});

export default function RootLayout() {
  // family 키는 design-system 의 fonts.serif/sans/mono ('Source Serif 4' / 'Inter' /
  // 'JetBrains Mono') 와 동일해야 한다 — RN 의 fontFamily prop 가 이 키로 조회된다.
  const [fontsLoaded, fontError] = useSourceSerif4({
    [fonts.serif]: SourceSerif4_400Regular,
    [`${fonts.serif}_600SemiBold`]: SourceSerif4_600SemiBold,
    [fonts.sans]: Inter_400Regular,
    [`${fonts.sans}_500Medium`]: Inter_500Medium,
    [`${fonts.sans}_600SemiBold`]: Inter_600SemiBold,
    [fonts.mono]: JetBrainsMono_400Regular,
    [`${fonts.mono}_500Medium`]: JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
