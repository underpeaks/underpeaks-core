import 'package:flutter/material.dart';

class NxfTextField extends StatelessWidget {
  final String label;
  final String? initialValue;
  final ValueChanged<String>? onChanged;

  const NxfTextField({
    super.key,
    required this.label,
    this.initialValue,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      controller: TextEditingController(text: initialValue),
      onChanged: onChanged,
    );
  }
}
