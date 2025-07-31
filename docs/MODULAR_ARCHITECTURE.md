# Modular Architecture Documentation

## Overview

The sandwich catering application has been refactored from a monolithic 1458-line component into a clean, modular architecture. This document explains the new structure and how to work with it.

## Architecture Overview

### Before Refactoring
- **Single Component**: 1458 lines in `app/page.js`
- **Mixed Concerns**: UI, state management, validation, and API calls all in one place
- **Hard to Maintain**: Changes required modifying the massive main component

### After Refactoring
- **Modular Structure**: Separated into focused components and hooks
- **Clean Architecture**: Each component has a single responsibility
- **87% Size Reduction**: Main component reduced from 1458 to ~200 lines

## Directory Structure

```
app/
├── components/
│   ├── wizard/
│   │   └── Wizard.jsx              # Main wizard container
│   └── steps/
│       ├── SandwichAmountStep.jsx  # Step 1: Amount selection
│       ├── SelectionTypeStep.jsx   # Step 2: Custom vs Variety
│       ├── OrderSummaryStep.jsx    # Step 3: Order review
│       ├── DeliveryStep.jsx        # Step 4: Delivery details
│       ├── ContactStep.jsx         # Step 5: Contact/Company info
│       └── PaymentStep.jsx         # Step 6: Payment processing
├── hooks/
│   ├── useOrderForm.js             # Form state management
│   └── useOrderValidation.js       # Validation logic
└── page.js                         # Main orchestration (200 lines)
```

## Component Responsibilities

### 🧙‍♂️ Wizard Components

#### `Wizard.jsx`
**Purpose**: Main wizard container that handles navigation and progress display
**Props**:
- `currentStep`: Current step number
- `setCurrentStep`: Function to change steps
- `steps`: Array of step definitions
- `isStepValid`: Function to check step validity
- `getValidationMessage`: Function to get validation messages
- `secondaryButtonClasses`: CSS classes for secondary buttons
- `primaryButtonClasses`: CSS classes for primary buttons

#### `WizardStep.jsx` (Future Enhancement)
Could be added for individual step wrapper functionality.

### 📋 Step Components

#### `SandwichAmountStep.jsx` (Step 1)
**Purpose**: Handle sandwich quantity selection
**Props**:
- `formData`: Current form state
- `updateFormData`: Function to update form data

#### `SelectionTypeStep.jsx` (Step 2)
**Purpose**: Choose between custom selection and variety offer
**Props**:
- `formData`: Current form state
- `updateFormData`: Function to update form data
- `sandwichOptions`: Available sandwich products

#### `OrderSummaryStep.jsx` (Step 3)
**Purpose**: Display order summary and collect allergies/comments
**Props**:
- `formData`: Current form state
- `updateFormData`: Function to update form data
- `setCurrentStep`: Function to navigate to other steps
- `sandwichOptions`: Available sandwich products
- `secondaryButtonClasses`: CSS classes for buttons

#### `DeliveryStep.jsx` (Step 4)
**Purpose**: Collect delivery and invoice address information
**Props**:
- `formData`: Current form state
- `updateFormData`: Function to update form data
- `date`: Selected delivery date
- `setDate`: Function to update delivery date
- `deliveryError`: Delivery validation errors
- `deliveryCost`: Calculated delivery cost

#### `ContactStep.jsx` (Step 5)
**Purpose**: Collect contact details and company information
**Props**:
- `formData`: Current form state
- `updateFormData`: Function to update form data
- `sandwichOptions`: Available sandwich products (for PDF generation)
- `deliveryCost`: Delivery cost for PDF generation
- `totalAmount`: Order total for PDF generation

#### `PaymentStep.jsx` (Step 6)
**Purpose**: Handle payment method selection and processing
**Props**:
- `formData`: Current form state
- `updateFormData`: Function to update form data
- `totalAmount`: Order total
- `deliveryCost`: Delivery cost
- `deliveryError`: Any delivery-related errors

### 🎣 Custom Hooks

#### `useOrderForm.js`
**Purpose**: Centralized form state management and business logic
**Returns**:
- `formData`: Complete form state object
- `updateFormData`: Function to update specific form fields
- `deliveryCost`: Calculated delivery cost
- `deliveryError`: Delivery-related error messages
- `totalAmount`: Calculated order total
- `restoreQuote`: Function to restore saved quotes

**Key Features**:
- Automatic delivery cost calculation
- Quote restoration from localStorage
- Form field validation and updates
- Company details logging

#### `useOrderValidation.js`
**Purpose**: Centralized validation logic for all steps
**Parameters**:
- `formData`: Current form state
- `deliveryError`: Current delivery errors
**Returns**:
- `isStepValid`: Function to check if a step is valid
- `getValidationMessage`: Function to get validation error messages

**Validation Rules**:
- Step 1: Minimum 15 sandwiches
- Step 2: Total selections must match sandwich count
- Step 3: Always valid (overview step)
- Step 4: All required delivery fields filled
- Step 5: Valid email, phone, and company details (if business)

## Adding New Steps

To add a new step to the wizard:

1. **Create Step Component**:
```jsx
// app/components/steps/NewStep.jsx
"use client";
import React from "react";

const NewStep = ({ formData, updateFormData }) => {
  return (
    <div className="space-y-6">
      {/* Your step content */}
    </div>
  );
};

export default NewStep;
```

2. **Add Step Definition**:
```jsx
// In app/page.js
const steps = [
  // ... existing steps
  { icon: YourIcon, title: "Your Step Title" },
];
```

3. **Add to Step Router**:
```jsx
// In renderStepContent()
case 7: // or next step number
  return (
    <NewStep
      formData={formData}
      updateFormData={updateFormData}
      // ... other props
    />
  );
```

4. **Add Validation** (if needed):
```jsx
// In useOrderValidation.js
case 7:
  return /* your validation logic */;
```

## State Management Patterns

### Form Updates
Always use `updateFormData` from the `useOrderForm` hook:
```jsx
updateFormData("fieldName", newValue);
```

### Validation
Use the validation hook for consistent validation:
```jsx
const { isStepValid, getValidationMessage } = useOrderValidation(formData, deliveryError);
```

### Step Navigation
Use `setCurrentStep` for navigation:
```jsx
setCurrentStep(3); // Go to step 3
setCurrentStep(prev => prev + 1); // Next step
```

## Performance Considerations

- **Lazy Loading**: Consider implementing lazy loading for step components
- **Memoization**: Use React.memo for step components that don't change often
- **State Optimization**: The hooks are optimized to prevent unnecessary re-renders

## Testing Strategy

### Unit Testing
- Test each step component independently
- Test custom hooks with different form states
- Test validation logic with various inputs

### Integration Testing
- Test wizard navigation flow
- Test form data persistence across steps
- Test quote restoration functionality

### E2E Testing
- Test complete order flow
- Test payment processing
- Test PDF generation

## Migration Guide

If you need to modify existing functionality:

1. **Find the Relevant Component**: Use the component responsibilities guide above
2. **Update Props**: Ensure all required props are passed
3. **Test in Isolation**: Test the component independently
4. **Test Integration**: Verify it works within the wizard flow

## Troubleshooting

### Common Issues

1. **Step Not Validating**: Check `useOrderValidation.js` for the step's validation logic
2. **Form Data Not Updating**: Ensure you're using `updateFormData` from the hook
3. **Navigation Issues**: Verify `isStepValid` returns true for the current step

### Debug Tools

- Use React DevTools to inspect component props
- Check browser console for validation errors
- Use the network tab to debug API calls

## Future Enhancements

Potential improvements to consider:

1. **Step Components Library**: Create reusable step component patterns
2. **Dynamic Step Loading**: Load steps based on user selections
3. **Step Validation Schemas**: Use a schema validation library like Yup or Zod
4. **State Persistence**: Add automatic form state saving
5. **Analytics Integration**: Track step completion rates and drop-off points

## Contributing

When working with this modular architecture:

1. **Keep Components Focused**: Each component should have a single responsibility
2. **Use TypeScript**: Consider adding TypeScript for better type safety
3. **Document Changes**: Update this documentation when adding new features
4. **Test Thoroughly**: Ensure changes don't break the wizard flow
5. **Follow Patterns**: Use the established patterns for consistency

---

*This architecture provides a solid foundation for maintaining and extending the sandwich catering application. The modular approach makes it easier to develop, test, and deploy new features while keeping the codebase clean and maintainable.* 