import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class NxfCupertinoCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const NxfCupertinoCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Icon(
        value ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.circle,
        color: value ? CupertinoColors.activeBlue : CupertinoColors.inactiveGray,
      ),
    );
  }
}
