import type { List } from "../prelude.d.mts";
import { toList } from "../prelude.mjs";

export function any<a>(
  set: Set<a>,
  predicate: (member: a) => boolean,
): boolean {
  for (const member of set) {
    if (predicate(member)) {
      return true;
    }
  }
  return false;
}

export function contains<a>(set: Set<a>, member: a): boolean {
  return set.has(member);
}

export function delete_member<a>(set: Set<a>, member: a): Set<a> {
  set = new Set(set);
  set.delete(member);
  return set;
}

export function difference<a>(set_a: Set<a>, set_b: Set<a>): Set<a> {
  return set_a.difference(set_b);
}

export function insert<a>(set: Set<a>, member: a): Set<a> {
  return new Set(set).add(member);
}

export function intersection<a>(set_a: Set<a>, set_b: Set<a>): Set<a> {
  return set_a.intersection(set_b);
}

export function is_disjoint<a>(set_a: Set<a>, set_b: Set<a>): boolean {
  return set_a.isDisjointFrom(set_b);
}

export function is_subset<a>(set_a: Set<a>, set_b: Set<a>): boolean {
  return set_a.isSubsetOf(set_b);
}

export function new_set<a>(iterable?: Iterable<a>): Set<a> {
  // TODO: test for list and convert to array
  return new Set(iterable);
}

export function size<a>(set: Set<a>): number {
  return set.size;
}

export function to_list<a>(set: Set<a>): List<a> {
  return toList([...set]);
}

export function union<a>(set_a: Set<a>, set_b: Set<a>): Set<a> {
  return set_a.union(set_b);
}
