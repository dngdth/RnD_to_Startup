import React from 'react';

export interface WorkflowStepDef {
  number: number;
  title: string;
  actor: 'Khách hàng' | 'Nhà thiết kế' | 'Hệ thống';
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStepDef[] = [];

export const DemoWorkflowController: React.FC = () => {
  return null;
};
