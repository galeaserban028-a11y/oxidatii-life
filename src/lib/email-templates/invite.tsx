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

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Ai fost invitat pe {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading as="h1" style={logo}>
          <span style={logoAccent}>{BRAND.name}</span>
        </Heading>
        <Text style={tagline}>Invitație</Text>
        <Section style={card}>
          <Heading as="h2" style={h1}>
            Ai fost invitat 🎉
          </Heading>
          <Text style={text}>
            Cineva te vrea în gașcă pe{" "}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Acceptă invitația și îți facem contul.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Acceptă invitația
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
          Nu te așteptai la invitație? Ignoră emailul.
          <br />© {new Date().getFullYear()} {BRAND.name}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;
