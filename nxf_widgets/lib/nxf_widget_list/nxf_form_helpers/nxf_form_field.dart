
import 'package:flutter/material.dart';

class NxfFormField extends StatelessWidget {
  final TextEditingController controller;
  final String? label;
  final FormFieldValidator<String>? validator;
  final AutovalidateMode autovalidateMode;

  const NxfFormField({
    super.key,
    required this.controller,
    this.label,
    this.validator,
    this.autovalidateMode = AutovalidateMode.disabled,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(labelText: label),
      validator: validator,
      autovalidateMode: autovalidateMode,
    );
  }
}
