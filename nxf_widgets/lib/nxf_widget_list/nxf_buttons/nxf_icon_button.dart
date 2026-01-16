import 'package:flutter/material.dart';

class NxfIconButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Icon icon;
  final Color? color;
  final double? size;

  const NxfIconButton({
    super.key,
    required this.onPressed,
    required this.icon,
    this.color,
    this.size,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      icon: icon,
      color: color,
      iconSize: size ?? 24.0,
    );
  }
}
