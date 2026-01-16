import 'package:flutter/cupertino.dart';

class NxfCupertinoTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? placeholder;
  final ValueChanged<String>? onChanged;
  final bool obscureText;

  const NxfCupertinoTextField({
    super.key,
    this.controller,
    this.placeholder,
    this.onChanged,
    this.obscureText = false,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoTextField(
      controller: controller,
      placeholder: placeholder,
      onChanged: onChanged,
      obscureText: obscureText,
    );
  }
}
