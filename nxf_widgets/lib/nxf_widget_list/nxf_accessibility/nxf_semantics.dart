
import 'package:flutter/material.dart';

class NxfSemantics extends StatelessWidget {
  final Widget child;
  final String? label;
  final bool? selected;

  const NxfSemantics({
    super.key,
    required this.child,
    this.label,
    this.selected,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      selected: selected,
      child: child,
    );
  }
}
