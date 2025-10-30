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
            formData.varietySelection.vegan +
            (formData.varietySelection.glutenFree || 0) >=
            formData.totalSandwiches // Must match the amount selected in step 1
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
        // Validate email format - support multiple emails separated by commas
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validateMultipleEmails = (emailString) => {
          if (!emailString || emailString.trim() === "") return false;
          
          const emails = emailString.split(',').map(email => email.trim());
          return emails.length > 0 && emails.every(email => {
            return email !== "" && emailRegex.test(email);
          });
        };
        const isEmailValid = validateMultipleEmails(formData.email);

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
            formData.varietySelection.vegan +
            (formData.varietySelection.glutenFree || 0);

          if (total < formData.totalSandwiches) {
            return `Please select at least ${formData.totalSandwiches} sandwiches (currently ${total})`;
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