'use client';

/**
 * Alert Rule Editor page
 *
 * Allows operators to create / edit alert rules using either
 * a threshold-based form or a Monaco Script Playground with
 * sandboxed JavaScript execution.
 */

import React from 'react';
import { AlertRuleEditor } from '../../../src/pages/alerts/AlertRuleEditor';
import '../../../src/styles/alertRuleEditor.css';

export default function AlertsEditorPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        paddingTop: 24,
        paddingBottom: 48,
      }}
    >
      <AlertRuleEditor
        onSaved={(rule) => {
          // In a real app this would navigate back to the alert rules list.
          // For now, log the saved rule.
          console.log('[AlertRuleEditor] Rule saved:', rule);
        }}
      />
    </main>
  );
}
