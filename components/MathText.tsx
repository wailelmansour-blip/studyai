// components/MathText.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MathJax from "react-native-mathjax-html-to-svg";

interface Props {
  content: string;
  color?: string;
  fontSize?: number;
}

export default function MathText({ content, color = "#111827", fontSize = 14 }: Props) {
  // Détecte si le contenu contient des formules LaTeX
  const hasMath = /\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\\int|\\sum|\\frac|\\sqrt/.test(content);

  if (!hasMath) {
    return (
      <Text style={{ color, fontSize, lineHeight: fontSize * 1.6 }}>
        {content}
      </Text>
    );
  }

  // Wrap le contenu en HTML avec MathJax
  const html = `
    <html>
    <head>
      <style>
        body { 
          font-family: sans-serif; 
          font-size: ${fontSize}px; 
          color: ${color};
          margin: 0;
          padding: 0;
          background: transparent;
        }
      </style>
    </head>
    <body>${content.replace(/\$\$(.*?)\$\$/gs, '\\[$1\\]').replace(/\$(.*?)\$/g, '\\($1\\)')}</body>
    </html>
  `;

  return (
    <MathJax
      mathJaxOptions={{
        messageStyle: "none",
        extensions: ["tex2jax.js"],
        jax: ["input/TeX", "output/SVG"],
        tex2jax: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
          displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        },
      }}
      html={html}
    />
  );
}