"use client";
import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

const Wizard = ({
  currentStep,
  setCurrentStep,
  steps,
  children,
  isStepValid,
  getValidationMessage,
  secondaryButtonClasses,
  primaryButtonClasses,
}) => {
  const handleNextStep = () => {
    const validationMessage = getValidationMessage(currentStep);
    if (!isStepValid(currentStep) && validationMessage) {
      toast.error(validationMessage);
    } else if (isStepValid(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  return (
    <div className="min-h-[70vh] bg-background">
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="flex justify-center items-center p-2 space-x-2 text-sm text-center bg-green-500 text-accent-foreground">
          <span className="font-bold">
            Free delivery for orders above €100,-{" "}
          </span>
        </div>
        <div className="container px-4 py-1 mx-auto">
          <div className="flex justify-between items-center">
            <Image
              src={"/tsb-logo-full.png"}
              alt="The Sandwich Bar Nassaukade B.V. Logo"
              className="w-16 md:w-20"
              width={250}
              height={250}
            />
            {/* Back Button */}
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className={`flex gap-1 items-center ${secondaryButtonClasses}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Go back
              </button>
            )}

            {/* Progress Text */}
            <div className="hidden text-sm font-medium text-gray-500 md:block">
              Step {currentStep} of {steps.length}
            </div>

            {/* Next Button */}
            {currentStep < steps.length && (
              <div className="flex items-end">
                <button
                  onClick={handleNextStep}
                  className={`${primaryButtonClasses} !bg-green-500 flex items-center gap-1 ${
                    !isStepValid(currentStep) ? "opacity-50" : ""
                  }`}
                >
                  {currentStep === steps.length - 1 ? "Payment" : "Next"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="container px-4 py-4 mx-auto">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  index + 1 === currentStep
                    ? "text-black"
                    : index + 1 < currentStep
                      ? "text-green-600"
                      : "text-gray-400"
                }`}
              >
                <div className="flex justify-center items-center w-8 h-8 rounded-full border-2 border-current bg-background">
                  <StepIcon className="w-4 h-4" />
                </div>
                <span className="hidden mt-1 text-xs md:block">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300 bg-primary"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-8 mx-auto md:px-4 md:container">
        <div className="p-6 rounded-lg shadow-md bg-background">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Wizard; 