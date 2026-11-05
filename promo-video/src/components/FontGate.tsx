import React, {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

/**
 * 等字体加载完再出帧。中文字体按 unicode 分片加载，所以把画面上会出现的全部文字（text）
 * 交给浏览器预取，避免某些帧先出现回退字体。
 */
export const FontGate: React.FC<{text: string; children: React.ReactNode}> = ({text, children}) => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const sample = text + '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz·/+-%';
    const specs = [
      '400 40px "Noto Sans SC"',
      '700 40px "Noto Sans SC"',
      '900 40px "Noto Sans SC"',
      '500 40px "Space Grotesk"',
      '700 40px "Space Grotesk"',
      '400 40px "JetBrains Mono"',
      '700 40px "JetBrains Mono"',
    ];
    Promise.all(specs.map((s) => document.fonts.load(s, sample)))
      .then(() => document.fonts.ready)
      .catch(() => undefined)
      .then(() => continueRender(handle));
  }, [handle, text]);
  return <>{children}</>;
};
