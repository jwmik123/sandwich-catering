"use client";

export const useOrderValidation = (formData, deliveryError) => {
  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return formData.totalSandwiches >= 15; // Minimum order requirement
      case 2:
        if (formData.selectionType === "custom") {
          const totalSelected = Object.values(formData.customSelection)
            .flat()
            .reduce((total, selection) => total + selection.quantity, 0);
          return totalSelected >= formData.totalSandwiches;
        }
        return (
          formData.selectionType === "variety" &&
          formData.varietySelection.vega +
            formData.varietySelection.nonVega +
            formData.varietySelection.vegan >=
            formData.totalSandwiches
        );
      case 3:
        return true; // Overview step is always valid
      case 4:
        // Validate delivery details
        return (
          formData.deliveryDate &&
          formData.deliveryTime &&
          formData.street &&
          formData.houseNumber &&
          formData.postalCode &&
          formData.city &&
          deliveryError !== "We do not deliver to this postal code."
        );

      case 5:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailRegex.test(formData.email);

        // Validate phone number (just check if not empty)
        const isPhoneValid = formData.phoneNumber.trim() !== "";

        // Base validation
        let isValid =
          isEmailValid && isPhoneValid && formData.name.trim() !== "";

        // Additional company validation if isCompany is checked
        if (!formData.isCompany) {
          isValid = isValid && formData.companyName.trim() !== "";
        }

        return isValid;
      default:
        return true;
    }
  };

  const getValidationMessage = (step) => {
    switch (step) {
      case 2:
        if (formData.selectionType === "custom") {
          const totalSelected = Object.values(formData.customSelection)
            .flat()
            .reduce((total, selection) => total + selection.quantity, 0);
          const remaining = formData.totalSandwiches - totalSelected;
          if (remaining > 0) {
            return `Please select ${remaining} sandwich${
              remaining === 1 ? "" : "es"
            }`;
          }
          // if (remaining < 0) {
          //   return `U heeft ${Math.abs(remaining)} broodje${
          //     Math.abs(remaining) === 1 ? "" : "s"
          //   } te veel geselecteerd`;
          // }
        }
        if (formData.selectionType === "variety") {
          const total =
            formData.varietySelection.vega +
            formData.varietySelection.nonVega +
            formData.varietySelection.vegan;

          if (Number(total) !== Number(formData.totalSandwiches)) {
            return `The total must be ${formData.totalSandwiches} sandwiches`;
          }
        }
        return "";
      case 4:
        return "Please fill in all fields";
      default:
        return "";
    }
  };

  return {
    isStepValid,
    getValidationMessage,
  };
}; 