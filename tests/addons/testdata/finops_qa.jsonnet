// Synthetic business values used only to verify standalone add-on tag propagation.
{
  environments: { qa: { projects: { payments: {} } } },
  cost_governance: {
    enable_tags: true,
    exclude_budgets: ['BUDGET-PROJECT-PAYMENTS-KEY'],
    owner_email: 'qa.owner@example.test',
    cost_center_assignments: {
      SHARED: { environment: ['shared'] },
      QA_IAM: { environment: ['qa'], platform: ['iam'] },
      QA_NETWORK: { environment: ['qa'], platform: ['network'] },
      QA_DATABASE: { environment: ['qa'], platform: ['finops'] },
    },
    cost_center_business_units: {
      SHARED: 'Shared Services',
      QA_IAM: 'Quality Assurance',
      QA_NETWORK: 'Quality Assurance',
      QA_DATABASE: 'Quality Assurance',
    },
  },
}
