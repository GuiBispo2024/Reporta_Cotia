import { SvgXml } from 'react-native-svg';
import { iconSvgs, type IconName } from '../theme/icons';
import { theme } from '../theme';
export type { IconName };
export function Icon({ name, size = 20, color = theme.colors.primary }: { name: IconName; size?: number; color?: string }) {
  return <SvgXml xml={iconSvgs[name]} width={size} height={size} color={color} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
