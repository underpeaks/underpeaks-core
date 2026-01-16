import 'package:flutter/material.dart';

class NxfLinearProgressIndicator extends StatelessWidget {
  final double? value;
  final Color? backgroundColor;
  final Color? valueColor;

  const NxfLinearProgressIndicator({
    super.key,
    this.value,
    this.backgroundColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return LinearProgressIndicator(
      value: value,
      backgroundColor: backgroundColor,
      valueColor: valueColor != null ? AlwaysStoppedAnimation(valueColor!) : null,
    );
  }
}
