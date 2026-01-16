
import 'package:flutter/material.dart';

class NxfExcludeSemantics extends StatelessWidget {
  final Widget child;

  const NxfExcludeSemantics({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(child: child);
  }
}
