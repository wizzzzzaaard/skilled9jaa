"use client";

import { AnimatePresence } from "framer-motion";
import { useSignup } from "@/lib/hooks/useSignup";
import { StepWrapper } from "./StepWrapper";
import { SignupHeader } from "./SignupHeader";
import { SignupProgress } from "./SignupProgress";
import { BasicStep } from "./steps/BasicStep";
import { RoleStep } from "./steps/RoleStep";
import { SetupStep } from "./steps/SetupStep";
import { SkillsStep } from "./steps/SkillsStep";
import { PaymentStep } from "./steps/PaymentStep";
import { PendingStep } from "./steps/PendingStep";
import { SuccessStep } from "./steps/SuccessStep";
import { HsServicesStep } from "./steps/HsServicesStep";
import { HsPlanStep } from "./steps/HsPlanStep";

export function SignupClient() {
  const s = useSignup();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <SignupHeader isHomeServiceMode={s.isHomeServiceMode} />
        <SignupProgress steps={s.steps} stepIndex={s.stepIndex} />

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <AnimatePresence mode="wait">
            {s.step === "basic" && (
              <StepWrapper stepKey="basic">
                <BasicStep
                  fullName={s.fullName}
                  setFullName={s.setFullName}
                  email={s.email}
                  setEmail={s.setEmail}
                  phone={s.phone}
                  setPhone={s.setPhone}
                  password={s.password}
                  setPassword={s.setPassword}
                  handleBasicSubmit={s.handleBasicSubmit}
                />
              </StepWrapper>
            )}

            {s.step === "role" && (
              <StepWrapper stepKey="role">
                <RoleStep
                  isHomeServiceMode={s.isHomeServiceMode}
                  hsRole={s.hsRole}
                  setHsRole={s.setHsRole}
                  isClient={s.isClient}
                  setIsClient={s.setIsClient}
                  isArtisan={s.isArtisan}
                  setIsArtisan={s.setIsArtisan}
                  isCompany={s.isCompany}
                  setIsCompany={s.setIsCompany}
                  isLoading={s.isLoading}
                  handleRoleSubmit={s.handleRoleSubmit}
                  setStep={s.setStep}
                />
              </StepWrapper>
            )}

            {s.step === "setup" && (
              <StepWrapper stepKey="setup">
               <SetupStep
                  bio={s.bio}
                  setBio={s.setBio}
                  phone={s.phone}
                  setPhone={s.setPhone}
                  state={s.state}
                  setState={s.setState}
                  city={s.city}
                  setCity={s.setCity}
                  lga={s.lga}
                  setLga={s.setLga}
                  latitude={s.latitude}
                  setLatitude={s.setLatitude}
                  longitude={s.longitude}
                  setLongitude={s.setLongitude}
                  locating={s.locating}
                  handleUseMyLocation={s.handleUseMyLocation}
                  isLoading={s.isLoading}
                  handleSetupSubmit={s.handleSetupSubmit}
                  setStep={s.setStep}
                  isArtisan={s.isArtisan}
                  isHomeService={s.isHomeService}
                  isPaidRole={s.isPaidRole}
                  isCompany={s.isCompany}
                  companyName={s.companyName}
                  setCompanyName={s.setCompanyName}
                  industry={s.industry}
                  setIndustry={s.setIndustry}
                  companyLocation={s.companyLocation}
                  setCompanyLocation={s.setCompanyLocation}
                  userId={s.userId}
                  onProfileImageUploaded={s.onProfileImageUploaded}
                />
              </StepWrapper>
            )}

            {s.step === "hs_services" && (
              <StepWrapper stepKey="hs_services">
                <HsServicesStep
                  categories={s.hsCategories}
                  loading={s.hsCategoriesLoading}
                  selectedIds={s.selectedHsCategoryIds}
                  setSelectedIds={s.setSelectedHsCategoryIds}
                  onSubmit={s.handleHsServicesSubmit}
                  onBack={() => s.setStep("setup")}
                />
              </StepWrapper>
            )}

            {s.step === "hs_plan" && (
              <StepWrapper stepKey="hs_plan">
                <HsPlanStep
                  selectedCategoryCount={s.selectedHsCategoryIds.length}
                  plan={s.hsPlan}
                  setPlan={s.setHsPlan}
                  onSubmit={s.handleHsPlanSubmit}
                  onBack={() => s.setStep("hs_services")}
                />
              </StepWrapper>
            )}

            {s.step === "skills" && (
              <StepWrapper stepKey="skills">
                <SkillsStep
                  availableSkills={s.availableSkills}
                  skillsLoading={s.skillsLoading}
                  skillFilter={s.skillFilter}
                  setSkillFilter={s.setSkillFilter}
                  selectedSkillIds={s.selectedSkillIds}
                  toggleSkill={s.toggleSkill}
                  isLoading={s.isLoading}
                  handleSkillsSubmit={s.handleSkillsSubmit}
                  setStep={s.setStep}
                />
              </StepWrapper>
            )}

            {s.step === "payment" && (
              <StepWrapper stepKey="payment">
                <PaymentStep
                  isHomeService={s.isHomeService}
                  paymentMethod={s.paymentMethod}
                  setPaymentMethod={s.setPaymentMethod}
                  bankDetails={s.bankDetails}
                  userId={s.userId}
                  isLoading={s.isLoading}
                  handleManualSubmit={s.handleManualSubmit}
                  handlePaystackPay={s.handlePaystackPay}
                  setStep={s.setStep}
                  isArtisan={s.isArtisan}
                amount={
                    s.isHomeService
                      ? s.calculateHomeServiceAmount()
                      : s.displayPrice
                  }
                  displayPrice={s.displayPrice}
                  slashPrice={s.slashPrice}
                />
              </StepWrapper>
            )}

            {s.step === "pending" && (
              <StepWrapper stepKey="pending">
                <PendingStep />
              </StepWrapper>
            )}

            {s.step === "success" && (
              <StepWrapper stepKey="success">
                <SuccessStep />
              </StepWrapper>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}