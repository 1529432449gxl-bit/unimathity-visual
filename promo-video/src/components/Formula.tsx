import React, {useMemo} from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/** KaTeX 公式。tex 为 LaTeX 源；display 为行间样式。 */
export const Formula: React.FC<{tex: string; size?: number; color?: string; display?: boolean; style?: React.CSSProperties}> = ({
  tex,
  size = 48,
  color = '#eef2fa',
  display = false,
  style,
}) => {
  const html = useMemo(() => katex.renderToString(tex, {throwOnError: false, displayMode: display, output: 'html'}), [tex, display]);
  return <span style={{fontSize: size, color, lineHeight: 1.2, ...style}} dangerouslySetInnerHTML={{__html: html}} />;
};
