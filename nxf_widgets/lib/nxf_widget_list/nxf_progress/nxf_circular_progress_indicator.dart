import 'package:flutter/material.dart';

class NxfCircularProgressIndicator extends StatelessWidget {
  final double? value;
  final double strokeWidth;
  final Color? backgroundColor;
  final Color? valueColor;

  const NxfCircularProgressIndicator({
    super.key,
    this.value,
    this.strokeWidth = 4.0,
    this.backgroundColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return CircularProgressIndicator(
      value: value,
      strokeWidth: strokeWidth,
      backgroundColor: backgroundColor,
      valueColor: valueColor != null ? AlwaysStoppedAnimation(valueColor!) : null,
    );
  }
}
