import 'package:flutter/cupertino.dart';

class NxfCupertinoSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const NxfCupertinoSwitch({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoSwitch(
      value: value,
      onChanged: onChanged,
    );
  }
}