import 'package:flutter/material.dart';

class NxfExpansionPanelList extends StatelessWidget {
  final List<ExpansionPanel> panels;
  final ExpansionPanelCallback expansionCallback;

  const NxfExpansionPanelList({
    super.key,
    required this.panels,
    required this.expansionCallback,
  });

  @override
  Widget build(BuildContext context) {
    return ExpansionPanelList(
      expansionCallback: expansionCallback,
      children: panels,
    );
  }
}
