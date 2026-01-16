import 'package:flutter/cupertino.dart';

class NxfCupertinoSearchTextField extends StatelessWidget {
  final ValueChanged<String>? onChanged;
  final String? placeholder;

  const NxfCupertinoSearchTextField({
    super.key,
    this.onChanged,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoSearchTextField(
      onChanged: onChanged,
      placeholder: placeholder,
    );
  }
}