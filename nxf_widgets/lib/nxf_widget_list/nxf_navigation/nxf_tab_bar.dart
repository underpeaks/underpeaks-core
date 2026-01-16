import 'package:flutter/material.dart';

class NxfTabBar extends StatelessWidget {
  final TabController controller;
  final List<Tab> tabs;

  const NxfTabBar({
    super.key,
    required this.controller,
    required this.tabs,
  });

  @override
  Widget build(BuildContext context) {
    return TabBar(
      controller: controller,
      tabs: tabs,
    );
  }
}
