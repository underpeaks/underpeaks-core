import 'package:flutter/material.dart';

class NxfStepper extends StatelessWidget {
  final int currentStep;
  final List<Step> steps;
  final ValueChanged<int>? onStepTapped;
  final VoidCallback? onStepContinue;
  final VoidCallback? onStepCancel;

  const NxfStepper({
    super.key,
    required this.currentStep,
    required this.steps,
    this.onStepTapped,
    this.onStepContinue,
    this.onStepCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Stepper(
      currentStep: currentStep,
      steps: steps,
      onStepTapped: onStepTapped,
      onStepContinue: onStepContinue,
      onStepCancel: onStepCancel,
    );
  }
}
