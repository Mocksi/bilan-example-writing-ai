import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { theme } from './theme';
import { AppShell } from '../components/AppShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getEnvironmentConfig } from '../lib/env';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bilan Content Creation Demo",
  description: "AI-powered content creation assistant showcasing Bilan SDK integration",
};

/**
 * Validates critical environment variables required for application startup
 * 
 * Performs comprehensive validation of environment configuration using getEnvironmentConfig()
 * and returns a structured result indicating success/failure with detailed error information.
 * This validation ensures the application has all required configuration before rendering
 * any UI components, preventing runtime failures due to missing environment setup.
 * 
 * @function validateEnvironment
 * @returns {Object} Validation result object
 * @returns {boolean} returns.success - Whether validation passed
 * @returns {EnvironmentConfig|null} returns.config - Validated config object or null on failure  
 * @returns {string|null} returns.error - Error message describing validation failure
 * 
 * @remarks
 * This function is called during root layout initialization to ensure:
 * - Required environment variables are present and valid
 * - Bilan SDK configuration is properly set up
 * - AI model configuration is available
 * - Development flags are correctly parsed
 * 
 * @example
 * ```typescript
 * const validation = validateEnvironment()
 * if (!validation.success) {
 *   return <ErrorFallback error={validation.error} />
 * }
 * // Proceed with normal app rendering
 * ```
 */
function validateEnvironment() {
  try {
    const config = getEnvironmentConfig();
    return { success: true, config, error: null };
  } catch (error) {
    return { 
      success: false, 
      config: null, 
      error: error instanceof Error ? error.message : 'Unknown environment validation error' 
    };
  }
}

/**
 * Fallback UI for environment validation failures
 */
function EnvironmentErrorFallback({ error }: { error: string }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <title>Configuration Error - Bilan Content Creation Demo</title>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'var(--font-geist-sans)',
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
            backgroundColor: '#fff',
            padding: '3rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
          }}>
            <h1 style={{ 
              color: '#dc2626', 
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              Environment Configuration Error
            </h1>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              The application could not start due to invalid environment configuration:
            </p>
            <code style={{
              display: 'block',
              backgroundColor: '#f3f4f6',
              padding: '1rem',
              borderRadius: '4px',
              color: '#dc2626',
              fontFamily: 'var(--font-geist-mono)',
              marginBottom: '1.5rem',
              wordBreak: 'break-word'
            }}>
              {error}
            </code>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              <p>Please check your environment variables and try again.</p>
              <p style={{ marginTop: '0.5rem' }}>
                See <code>.env.example</code> for required configuration.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Validate environment variables on startup
  const envValidation = validateEnvironment();
  
  // Render fallback UI if validation fails
  if (!envValidation.success) {
    return <EnvironmentErrorFallback error={envValidation.error!} />;
  }

  // Proceed with normal app rendering if validation succeeds
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MantineProvider theme={theme}>
          <Notifications />
          <ErrorBoundary>
            <AppShell>
              {children}
            </AppShell>
          </ErrorBoundary>
        </MantineProvider>
      </body>
    </html>
  );
}
