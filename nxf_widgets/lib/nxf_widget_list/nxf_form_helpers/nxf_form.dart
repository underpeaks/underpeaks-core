
import 'package:flutter/material.dart';

class NxfForm extends StatelessWidget {
  final Widget child;
  final GlobalKey<FormState> formKey;
  final AutovalidateMode autovalidateMode;

  const NxfForm({
    super.key,
    required this.child,
    required this.formKey,
    this.autovalidateMode = AutovalidateMode.disabled,
  });

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      autovalidateMode: autovalidateMode,
      child: child,
    );
  }
}
