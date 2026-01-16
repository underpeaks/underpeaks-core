import 'package:flutter/material.dart';

class NxfNavDrawer extends StatelessWidget {
  final List<Widget> children;

  const NxfNavDrawer({
    super.key,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        children: children,
      ),
    );
  }
}
