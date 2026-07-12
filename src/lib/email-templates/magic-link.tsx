import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
  link,
  buttonWrap,
  button,
  footer,
  smallLine,
} from "./_brand";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Link-ul tău de login pentru {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading as="h1" style={logo}>
          <span style={logoAccent}>{BRAND.name}</span>
        </Heading>
        <Text style={tagline}>Login rapid</Text>
        <Section style={card}>
          <Heading as="h2" style={h1}>
            Link-ul tău magic ✨
          </Heading>
          <Text style={text}>
            Apasă butonul de mai jos ca să te loghezi la {siteName}. Link-ul expiră repede,
            folosește-l acum.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Intră în cont
            </Button>
          </Section>
          <Text style={smallLine}>
            Nu merge butonul? Copiază link-ul:
            <br />
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Text>
        </Section>
        <Text style={footer}>
          Nu ai cerut tu login? Ignoră emailul.
          <br />© {new Date().getFullYear()} {BRAND.name}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;
