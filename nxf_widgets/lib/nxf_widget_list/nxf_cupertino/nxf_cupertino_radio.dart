import 'package:flutter/cupertino.dart';

class NxfCupertinoRadio<T> extends StatelessWidget {
  final T value;
  final T groupValue;
  final ValueChanged<T?> onChanged;

  const NxfCupertinoRadio({
    super.key,
    required this.value,
    required this.groupValue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoRadio<T>(
      value: value,
      groupValue: groupValue,
      onChanged: onChanged,
    );
  }
}