import { Text, View } from 'react-native';
import { colors, fonts } from '@synapse/design-system';

const PAPER_HEX = '#F5F0E8';
const INK_HEX = '#2A2620';

void colors;

export default function Home() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PAPER_HEX,
      }}
    >
      <Text style={{ color: INK_HEX, fontFamily: fonts.serif, fontSize: 24 }}>
        Synapse
      </Text>
    </View>
  );
}
