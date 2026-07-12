import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  BRAND,
  main,
  container,
  logo,
  logoAccent,
  tagline,
  card,
  h1,
  text,
  codeStyle,
  footer,
} from "./_brand";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Codul tău de verificare {BRAND.name}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading as="h1" style={logo}>
          <span style={logoAccent}>{BRAND.name}</span>
        </Heading>
        <Text style={tagline}>Cod verificare</Text>
        <Section style={card}>
          <Heading as="h2" style={h1}>
            Confirmă identitatea 🔐
          </Heading>
          <Text style={text}>Folosește codul de mai jos ca să confirmi:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={text}>
            Codul expiră repede. Nu-l da nimănui, echipa {BRAND.name} nu-l va cere niciodată.
          </Text>
        </Section>
        <Text style={footer}>
          Nu tu ai cerut codul? Ignoră emailul.
          <br />© {new Date().getFullYear()} {BRAND.name}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReauthenticationEmail;
