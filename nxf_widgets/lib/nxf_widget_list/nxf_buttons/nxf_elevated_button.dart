// File: lib/nfx_widget_list/buttons/nxf_elevated_button.dart
import 'package:flutter/material.dart';

class NxfElevatedButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Widget child;
  final Color? color;
  final EdgeInsetsGeometry? padding;
  final double? borderRadius;

  const NxfElevatedButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.color,
    this.padding,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        padding: padding,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius ?? 8),
        ),
      ),
      child: child,
    );
  }
}
