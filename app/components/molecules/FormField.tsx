import React from "react";
import { Input, InputProps } from "../atoms";

export interface FormFieldProps extends InputProps {
  icon?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ icon, ...props }) => {
  return <Input icon={icon} {...props} />;
};

export default FormField;
