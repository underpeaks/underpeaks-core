import 'package:flutter/material.dart';

class NxfCustomScrollView extends StatelessWidget {
  final List<Widget> slivers;

  const NxfCustomScrollView({
    super.key,
    required this.slivers,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: slivers,
    );
  }
}
