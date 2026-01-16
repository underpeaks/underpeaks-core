import 'package:flutter/material.dart';

class NxfTabs extends StatelessWidget {
  final List<Tab> tabs;
  final List<Widget> tabViews;

  const NxfTabs({
    super.key,
    required this.tabs,
    required this.tabViews,
  });

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: tabs.length,
      child: Column(
        children: [
          TabBar(tabs: tabs),
          Expanded(
            child: TabBarView(children: tabViews),
          ),
        ],
      ),
    );
  }
}
