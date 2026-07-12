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

interface EmailChangeEmailProps {
  siteName: string;
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Confirmă schimbarea emailului pentru {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading as="h1" style={logo}>
          <span style={logoAccent}>{BRAND.name}</span>
        </Heading>
        <Text style={tagline}>Schimbare email</Text>
        <Section style={card}>
          <Heading as="h2" style={h1}>
            Confirmă emailul nou ✉️
          </Heading>
          <Text style={text}>
            Ai cerut să schimbi emailul pentru {siteName} de la{" "}
            <Link href={`mailto:${oldEmail}`} style={link}>
              {oldEmail}
            </Link>{" "}
            la{" "}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Confirmă schimbarea
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
          Nu tu ai cerut schimbarea? Securizează-ți contul imediat.
          <br />© {new Date().getFullYear()} {BRAND.name}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;
