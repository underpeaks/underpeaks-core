import 'package:flutter/material.dart';

class NxfChip extends StatelessWidget {
  final String label;
  final VoidCallback? onDeleted;
  final Color? backgroundColor;

  const NxfChip({
    super.key,
    required this.label,
    this.onDeleted,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(label),
      onDeleted: onDeleted,
      backgroundColor: backgroundColor,
    );
  }
}
