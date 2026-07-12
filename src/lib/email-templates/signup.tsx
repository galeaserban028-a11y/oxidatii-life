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

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Confirmă-ți emailul și intră în haos.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading as="h1" style={logo}>
          <span style={logoAccent}>{BRAND.name}</span>
        </Heading>
        <Text style={tagline}>Șprițul începe aici</Text>
        <Section style={card}>
          <Heading as="h2" style={h1}>
            Bine ai venit! 🍹
          </Heading>
          <Text style={text}>
            Mersi că te-ai înscris pe{" "}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Un ultim pas — confirmă emailul{" "}
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>{" "}
            ca să pornim petrecerea.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Confirmă emailul
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
          Dacă nu tu ai făcut contul, ignoră emailul.
          <br />© {new Date().getFullYear()} {BRAND.name}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SignupEmail;
